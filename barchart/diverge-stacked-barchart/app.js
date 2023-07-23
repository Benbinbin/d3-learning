// 参考自 https://observablehq.com/@d3/diverging-stacked-bar-chart/2

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 设置一些关于尺寸的参数
// margin 为前缀的产生是在外四边留白，构建一个显示的安全区，以便在四周显示坐标轴
const marginTop = 40;
const marginRight = 30;
const marginBottom = 0;
const marginLeft = 80;
// svg 的宽度
const width = container.clientWidth;
// svg 元素的高度不再由页面的高度来决定
// 在下面会基于条形图中条带的宽度和数量通过计算得出
let height = 0;

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 诚信度的分类（对原始数据的分类重新整合和重命名）
const categories = {
  "pants-fire": "Pants on fire!",
  "false": "False",
  "mostly-false": "Mostly false",
  "barely-true": "Mostly false", // 对于该原始的类型，重新分类（进行合并）
  "half-true": "Half true",
  "mostly-true": "Mostly true",
  "true": "True"
};
// 负面分类
const negatives = ["Pants on fire!", "False", "Mostly false"];
// 正面分类
const positives = ["Half true", "Mostly true", "True"];

// 将各种诚信度的类别映射到相应的数值（+1 或 -1）
const signs = new Map([].concat(
  negatives.map(d => [d, -1]), // 各种负面的类别与 -1 绑定
  positives.map(d => [d, +1]) // 各种正面的类别与 +1 绑定
));

// 数据来源网页 https://observablehq.com/@d3/diverging-stacked-bar-chart/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/649f0ba21ee0e5a371c2997cf67026ca/raw/aa0bba1716ebe6969351cb1af623a707ec5a3339/politifact.csv";

// 使用方法 d3.csv() 读取 csv 文件并载入其中的数据集作为一个数组
// 具体参考官方文档 d3-dsv 模块 https://github.com/d3/d3-dsv#csvParse
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-fetch-and-parse-data
// 第一个参数 dataURL 是字符串，一个指向 csv 文件的链接
// 第二个（可选）参数是一个函数，用于对行数据进行**转换或筛选**（就像为每一行的数据应用数组的 map 函数和 filter 函数）
// 如果设置了转换函数，则数据项（每一行数据，不包含第一行，即表头行）均会调用该函数，并依次传入 3 个参数：
// * d 当前所遍历的数据项（当前的行数据）
// * i 当前所遍历的数据项的索引，从 0 开始计算（即原表格的第二行）
// * columnsArr 一个包含原表格的所有列名的数组
// 最后返回一个对象数组，即其中的每一个元素都是一个对象，它对应于一个数据项（即原始表格中的一行数据），以键值对 key: value 的方式来存储原来的二维数据
// 而且返回的数组具有属性 columns（属性值是一个数组）包含原始数据表的表头信息
d3.csv(
  dataURL,
  // 这里的转换函数只使用了（当前所遍历的数据项）d，并对其进行了解构，以便对列名进行了「重命名」
  // * speaker -> name 总统候选人的姓名
  // * ruling -> category 诚信度的类别
  // * count -> value （说谎/说实话的次数）统计量
  ({ speaker: name, ruling: category, count: value }) => {
    // 而在转换函数内部，会根据当前所遍历的（行）数据中总统候选人说话的类别是否包含在前面所预设的类别 categories 中
    // 如果对应于其中的某个类别，则返回一个对象作为转换结果；否则返回 null 将这一行数据作为无效数据
    // ⚠️ 如果函数返回 null 或 undefined 则该行数据就会被忽略跳过（最终不会包含在解析结果数组中）
    return categories[category] ? { name, category: categories[category], value: +value } : null
  }
).then((data) => {

  /**
   *
   * 数据处理
   *
   */
  // 将 data 数据点的属性 value 进行转换，从绝对值变成相对值（标准化/归一化）
  // 方法 d3.rollup() 的原本作用是对前面的数据集进行分组，并对各分组进行「压缩降维」，返回一个 InternMap 对象
  // 在映射中键名是分组的名称，而对应的值就是相应分组的概要性的描述
  // 第一个参数是需要处理的原始数据集
  // 第二个参数是对分组进行压缩的函数，每个分组会依次调用该函数（入参就是包含各个分组元素的数组），返回值会作为 InternMap 对象中（各分组的）键值对中的值
  // 余下的参数是分组依据（如果是函数，就以返回值作为分组依据）
  // 具体参考官方文档 d3-array 模块 https://github.com/d3/d3-array#rollup
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process
  // ⚠️ 但是这里的作用并不是对数据进行分组和「压缩降维」，而是对 data 的数据直接进行修改
  d3.rollup(
    // 上面解析得到的 data 作为数据集
    data,
    // 分组压缩函数，但是并没有返回任何值，因为这里的作用是直接对 data 的数据进行修改
    group => {
      // 先对该分组的各个数据里的 value 进行求和
      const sum = d3.sum(group, d => d.value);
      // 再通过遍历该分组 group 的每个元素，将属性 value 从绝对值转变为相对值（即相对总和 sum 的比例）
      for (const d of group) d.value /= sum;
    },
    // 基于数据的 name 属性分组，即总统候选人的名字来对原始数据进行分组
    d => d.name);

  console.log({ data });

  // 计算每个总统候选人的最大偏差量 bias（即负面类别的数据的总和），后面会用于设置纵坐标轴刻度值的定位
  // 并使用方法 d3.sort() 进行排序
  // 默认采用升序排列，由于数据都是负值，所以负面程度较大的总统候选人会更靠前
  // 返回一个嵌套数组，即每个元素也是一个数组
  // 这些内嵌的数组每个都只有两个元素，第一个元素是总统候选人的名称，第二个元素是 bias 值
  const bias = d3.sort(
    // 使用方法 d3.rollup() 对前面的数据集进行分组，并对各分组进行「压缩降维」，返回一个 InternMap 对象
    // 具体参考官方文档 d3-array 模块 https://github.com/d3/d3-array#rollup
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process
    d3.rollup(
      // 需要分组的数据 data ，并以分组的负面评价占比
      data,
      // 采用该分组/该候选人中，负面类别的数据 d.value（单位是百分比）的累加值来表示该分组的情况
      // ⚠️ 注意里只统计了负面类型的数据
      // 因为 Math.min(0, signs.get(d.category)) 返回最小值，所以正面类别的数据的返回值为 0，只有负面类别的数据的返回值为 -1
      v => d3.sum(v, d => d.value * Math.min(0, signs.get(d.category))),
      // 基于数据点的属性 d.name 即总统候选人的名称进行分组
      d => d.name
    ),
    // 这个参数并不是对比器 comparator，而是数据访问器 accessor
    // 由于传入的可迭代对象/数据集（即前面 d3.rollup() 方法所返回的值）是一个 InternMap 对象
    // 在排序时，实际对比的是当前所遍历值的第二个元素
    ([, a]) => a
  );

  console.log({ bias });

  // 通过堆叠生成器对数据进行转换，便于后续绘制堆叠图
  // ⚠️ 需要留意的是发散型堆叠条形图有两个方向，即对正面系列和负面系列的堆叠方向是不同的
  // 返回一个数组，每一个元素都是一个系列（条形图中每个条带就是由多个系列堆叠而成的）
  // D3 为每一个系列都设置了一个属性 key 其值是系列名称
  // 而每一个元素（系列）也是一个数组，其中每个元素是该系列在条形图的每个条带中的相应值，例如在本示例中，有 9 个总统候选人，所以每个系列会有 9 个数据点
  // 具体可以参考官方文档 https://d3js.org/d3-shape/stack 或 https://github.com/d3/d3-shape/blob/main/README.md
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#堆叠生成器-stacks
  const series = d3.stack()
    // 设置系列的名称（数组），即诚信度的各种分类
    .keys([].concat(negatives.slice().reverse(), positives))
    // 设置各系列的数据读取函数
    // 在调用堆叠生成器对原始数据进行转换过程中，每一个原始数据 d 和系列名称 key（就是在 stack.keys([keys]) 设定的数组中的元素）会作为入参，分别调用该函数，以从原始数据中获取相应系列的数据
    // 数据读取函数的逻辑要如何写，和后面 👇👇 调用堆叠生成器时，所传入的数据格式紧密相关
    // 因为（调用堆叠生成器）传入的数据是一个嵌套映射
    // 在遍历数据点时
    // 传入的第一个参数是当前所遍历的数据点，通过解构 [key, value] 第二个元素就是映射（第一层）的值（它也是一个映射）
    // 传入的第二个参数 category 是当前所遍历的系列名称
    // 然后通过 value.get(category) 从映射中获取相应系列（诚信度）的数据（如果该候选人没有这个系列的数据，则默认值为 0）
    // 由于正面系列和负面系列的堆叠方向是不同的，所以最后返回的值还需要乘上 signs.get(category) 它的值是 +1  或 -1 以表示方向
    .value(([, value], category) => signs.get(category) * (value.get(category) || 0))
    // 设置堆叠基线函数，这里采用 D3 所提供的一种默认基线函数
    // 允许正值和负值分别进行堆叠，正值会在零之上进行堆叠，负值会在零之下堆叠
    // 具体可以参考官方文档 https://github.com/d3/d3-shape#stackOffsetDiverging
    .offset(d3.stackOffsetDiverging)
    // 调用堆叠生成器，传入数据
    // 传入的数据并不是 data 而是经过 d3.rollup() 进行分组归类转换的
    // 其作用是通过两个 d3.rollup() 方法将 data 数据点按照 name 属性进行分组，然后再按照 category 属性进行分类
    // 最后返回得到一个（嵌套）映射
    // 可以将这个处理步骤看作看作将「扁平」的 data 数组结构，转换为 key-value 映射结构
    // 所得到的对象其实有两层嵌套的映射结构
    // 首先是按照 name 总统候选人的名称进行映射
    // 而在每个总统候选人的数据里，再按照 category 不同的诚信度类别进行映射
    (d3.rollup(data, data => d3.rollup(data, ([d]) => d.value, d => d.category), d => d.name));

  console.log(series);

  /**
   *
   * 计算 svg 元素的高度
   *
   */
  // 每一个条带高度（包含间隔）为 33 px
  const height = bias.length * 33 + marginTop + marginBottom;

  // 创建 svg
  // 在容器 <div id="container"> 元素内创建一个 SVG 元素
  // 主要使用 d3-selection 模块的 API
  // 具体可以参考 https://github.com/d3/d3-selection 或 https://d3js.org/d3-selection
  // 使用方法 d3.create("svg") 创建一个 svg 元素，并返回一个选择集 selection
  // 使用选择集的方法 selection.attr() 为选择集中的所有元素（即 <svg> 元素）设置宽高和 viewBox 属性
  const svg = d3
    .select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是连续型的数值（各种诚信度类别的占比），使用 d3.scaleLinear 构建一个线性比例尺
  // 具体参考官方文档 https://d3js.org/d3-scale/linear 或 https://github.com/d3/d3-scale/tree/main#linear-scales
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#线性比例尺-linear-scales
  const x = d3.scaleLinear()
    // 设置定义域范围
    // 使用方法 d3.extent() 获取可迭代对象的范围，即返回一个由最小值和最大值构成的数组 [min, max]
    // 使用 series.flat(2) 将嵌套数组 series「拍平」变成一个一维数组
    .domain(d3.extent(series.flat(2)))
    // 设置值域范围（所映射的可视元素）
    // 使用 scale.rangeRound() 方法，可以进行修约，以便实现整数（百分比）映射到整数（像素）
    // svg 元素的宽度（减去留白区域）
    .rangeRound([marginLeft, width - marginRight])

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是条形图的各种分类，使用 d3.scaleBand 构建一个带状比例尺
  // 使用 d3-scale 模块
  // 具体参考官方文档 https://d3js.org/d3-scale/band 或 https://github.com/d3/d3-scale/blob/v4.0.2/README.md#scaleBand
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#带状比例尺-band-scales
  const y = d3.scaleBand()
    // 设置定义域范围（9 个总统候选人的名称）
    .domain(bias.map(([name]) => name))
    // scale.rangeRound() 方法，可以进行修约，以便实现整数（人）映射到整数（像素）
    .rangeRound([marginTop, height - marginBottom])
    .padding(2 / 33) // 并设置间隔占据（柱子）区间的比例

  // 设置颜色比例尺
  // 为不同系列设置不同的配色
  // 使用 d3.scaleOrdinal() 排序比例尺 Ordinal Scales 将离散型的定义域映射到离散型值域
  // 具体参考官方文档 https://d3js.org/d3-scale/ordinal 或 https://github.com/d3/d3-scale/tree/main#scaleOrdinal
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#排序比例尺-ordinal-scales
  const color = d3.scaleOrdinal()
    // 设置定义域范围
    // 各系列的名称，即各种诚信度的类别（包括正面和负面共 6 种）
    .domain([].concat(negatives, positives))
    // 设置值域范围
    // 使用 D3 内置的一种颜色比例尺 d3.schemeSpectral
    // 它是一个数组，包含一些预设的配色方案
    // 通过 d3.schemeSpectral[k] 的形式可以快速获取一个数组，其中包含 k 个元素，每个元素都是一个表示颜色的字符串
    // 其中 k 需要是 3~11 （包含）之间的数值
    // 具体参考官方文档 https://d3js.org/d3-scale-chromatic/diverging#schemeSpectral 或 https://github.com/d3/d3-scale-chromatic/tree/main#schemeSpectral
    // 这里根据系列的数量生成相应数量的不同颜色值
    .range(d3.schemeSpectral[negatives.length + positives.length])

  /**
   *
   * 格式化数据的函数
   *
   */
  // 用于堆叠的小矩形 tooltip 文本内容，以及坐标轴刻度
  // 数据点先取绝对值，再转换以百分比的形式（且精度保留到百分位）
  const formatValue = ((format) => (x) => format(Math.abs(x)))(d3.format(".0%"));

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制横坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到顶部
    .attr("transform", `translate(0,${marginTop})`)
    // 💡 横轴是一个刻度值朝上的坐标轴
    // 并使用坐标轴对象的方法 axis.ticks() 设置坐标轴的刻度数量
    // 使用方法 axis.tickFormat() 设置刻度值格式，数据点先取绝对值，再转换以百分比的形式（且精度保留到百分位）
    // 使用方法 axis.tickSizeOuter(0) 将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
    .call(d3.axisTop(x)
      .ticks(width / 80)
      .tickFormat(formatValue)
      .tickSizeOuter(0))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 为正向横坐标轴添加注释文字
    .call(g => g.append("text")
      // 设置文本的定位（在 x 和 y 方向上的偏移量）
      .attr("x", x(0) + 20)
      .attr("y", -24)
      .attr("fill", "currentColor") // 设置文字的颜色
      .attr("text-anchor", "start") // 设置文字的对齐方式
      .text(data.positive))
    // 为负向横坐标轴添加注释文字
    .call(g => g.append("text")
      .attr("x", x(0) - 20)
      .attr("y", -24)
      .attr("fill", "currentColor")
      .attr("text-anchor", "end")
      .text(data.negative));

  // 绘制纵坐标轴
  svg.append("g")
    // 💡 纵轴是一个刻度值朝左的坐标轴
    .call(d3.axisLeft(y).tickSizeOuter(0))
    // 设置坐标轴刻度线和刻度值的定位
    // 通过 class 类名 ".tick" 选中所有的刻度（容器，其中分别包括两个元素，<line> 是刻度线，<text> 是刻度值）
    // 绑定数据 bias
    // 它一个嵌套数组，即每一个元素都是一个数组，这些内嵌的数组都有两个元素
    // 可以通过解构 [name, min] 获取到总统候选人的名称 name，及其对应的负面类别的数据的总和 min
    // 然后通过 x(min) 可以得到该总统候选人所对应的条带的左端的横坐标轴的值
    // 通过 y(name) 可以得到该总统候选人所对应的条带的纵坐标轴的值
    // 那么 y(name) + y.bandwidth() / 2 就是条带的中间位置（由于 svg 的正方向是向右和向下的）
    // 然后通过设置 CSS 的 transform 属性基于以上的计算值，将刻度移到相应的（条带左端）位置
    .call(g => g.selectAll(".tick").data(bias).attr("transform", ([name, min]) => `translate(${x(min)},${y(name) + y.bandwidth() / 2})`))
    // 而纵坐标轴的轴线（含有 class 类名 ".domain" 从 svg 的左侧移动到横坐标轴的零点位置 x(0)
    .call(g => g.select(".domain").attr("transform", `translate(${x(0)},0)`));

  /**
   *
   * 绘制条形图内的柱子
   *
   */
  // 绘制的步骤与一般的条形图会有所不同
  // 因为普通的条形图每一个条带都只是有一个矩形构成
  // 而堆叠条形图的每一个条带是由多个小的矩形依次堆叠而成的
  // 相应地，它们所绑定/对应的数据结构也不同
  // 普通的条形图所绑定的数据是一个数组，页面上每一个条带对应数组中的一个元素
  // 而堆叠条形图所绑定的数据是一个嵌套数组，页面上每一个堆叠层分别对应于数组的一个元素（一个系列数据，它也是一个数组），而同一堆叠层的不同小矩形则分别对应于嵌套数组中的一个元素
  // 所以需要在绘制堆叠条形图时需要进行数据「二次绑定」
  svg.append("g")
    .selectAll("g") // 返回一个选择集，其中虚拟/占位元素是 <g> 它们作为各系列的容器
    .data(series) // 绑定数据，每个容器 <g> 对应一个系列数据
    .join("g")
    .attr("fill", d => color(d.key)) // 设置颜色，不同系列/堆叠层对应不同的颜色
    // 基于原有的选择集进行「次级选择」，选择集会发生改变
    // 详细介绍可以查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#次级选择
    .selectAll("rect") // 使用 <rect> 元素为每一堆叠层绘制出一系列的小矩形
    // 返回的选择集是由多个分组（各个 <g> 容器中）的虚拟/占位 <rect> 元素构成的
    // ⚠️ 使用 select.selectAll() 所创建的新选择集会有多个分组
    // 由于新的选择集会创建多个分组，那么原来所绑定数据与（选择集中的）元素的对照关系会发生改变
    // 从原来的一对一关系，变成了一对多关系，所以新的选择集中的元素**不会**自动「传递/继承」父节点所绑定的数据
    // 所以如果要将原来选择集中所绑定的数据继续「传递」下去，就需要手动调用 selection.data() 方法，以显式声明要继续传递数据
    // 在这种场景下，该方法的入参应该是一个返回数组的**函数**
    // 每一个分组都会调用该方法，并依次传入三个参数：
    // * 当前所遍历的分组的父节点所绑定的数据 datum
    // * 当前所遍历的分组的索引 index
    // * 选择集的所有父节点 parent nodes
    // 详细介绍可以查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#绑定数据
    // 所以入参 d 是一个堆叠系列的数据（即 series 的一个嵌套数组）
    // 每个元素是一个二元数组，第一个元素是堆叠小矩阵的下/左边界；第二个元素是上/右边界；另外数组对象还具有一个属性 data 它包含原始数据（它也是一个二元数组，其中第一个元素 data[0] 就是所对应的总统候选人的名称）
    // 这个函数的作用相当于为每个元素（数组对象）添加一个 key 属性（所属的系列名称/诚信度类别），返回所构造的新对象
    .data(d => d.map(v => Object.assign(v, { key: d.key })))
    .join("rect") // 将元素绘制到页面上
    // 为每个小矩形分别设置左上角 (x, y) 及其 width 和 height 来确定其定位和形状
    // 每个矩形的左上角横轴定位 x 由它的堆叠上边界决定
    // 可以通过它所绑定的数据（一个数组）的第一个元素 d[0] 来获取
    // 使用横坐标轴的比例尺（线性比例尺）进行映射，求出具体的横轴坐标值
    .attr("x", d => x(d[0]))
    // 每个矩形的左上角纵轴定位 y 由它所属的总统候选人的名称决定
    // 可以通过所绑定数据的属性 d.data[0] 来获取，下面直接通过数组解构同时赋值的方式，将该值传递给变量 name
    .attr("y", ({ data: [name] }) => y(name))
    // 每个矩形的宽度
    // 由所绑定的数据（一个数组）的两个元素（上边界和下边界）之间的差值所决定
    .attr("width", d => x(d[1]) - x(d[0]))
    // 每个矩形的高度
    // 通过纵轴的比例尺的方法 y.bandwidth() 获取 band 的宽度（不包含间隙 padding）
    .attr("height", y.bandwidth())
    // 最后为每个矩形 <rect> 元素之内添加 <title> 元素
    // 以便鼠标 hover 在相应的小矩形之上时，可以显示 tooltip 提示信息
    .append("title")
    // 设置 tooltip 的文本内容
    // 通过解构来获取所绑定的（数组）对象的属性 key 和 data
    // 其中属性 key 是当前小矩形所属的诚信度类别的
    // 而属性 data 是一个二元数组
    // 对它进一步进行解构 [name, value] 第一个元素 name 是总统候选人的名称，第二个元素 value 是一个 Map 映射，包含该总统候选人的所有诚信度类别的映射值
    // 所以可以通过 value.get(key) 获取到该总统候选人的诚信度类别 key 的占比（百分比）
    .text(({ key, data: [name, value] }) => `${name}
      ${formatValue(value.get(key))} ${key}`);

});