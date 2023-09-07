// 参考自 https://observablehq.com/@mbostock/revenue-by-music-format-1973-2018

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
// margin 的作用是在 svg 的外周留白，构建一个显示的安全区，以便在四周显示坐标轴
const margin = ({ top: 20, right: 30, bottom: 30, left: 30 })

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

// 设置不同的音乐媒介格式与为不同的颜色的映射关系
// 共 23 种不同的音乐媒介格式，对应于堆叠条形图中 23 个系列
// 由于不同的音乐媒介存续的时期不同，所以并不是每一个条带都包含完整的 23 个堆叠层
const colors = new Map([
  // 黒胶/磁带
  ["LP/EP", "#2A5784"],
  ["Vinyl Single", "#43719F"],
  ["8 - Track", "#5B8DB8"],
  ["Cassette", "#7AAAD0"],
  ["Cassette Single", "#9BC7E4"],
  ["Other Tapes", "#BADDF1"],
  // CD/DVD
  ["Kiosk", "#E1575A"],
  ["CD", "#EE7423"],
  ["CD Single", "#F59D3D"],
  ["SACD", "#FFC686"],
  ["DVD Audio", "#9D7760"],
  ["Music Video (Physical)", "#F1CF63"],
  // 离线下载
  ["Download Album", "#7C4D79"],
  ["Download Single", "#9B6A97"],
  ["Ringtones & Ringbacks", "#BE89AC"],
  ["Download Music Video", "#D5A5C4"],
  ["Other Digital", "#EFC9E6"],
  ["Synchronization", "#BBB1AC"],
  // 在线播放
  ["Paid Subscription", "#24693D"],
  ["On-Demand Streaming (Ad-Supported)", "#398949"],
  ["Other Ad-Supported Streaming", "#61AA57"],
  ["SoundExchange Distributions", "#7DC470"],
  ["Limited Tier Paid Subscription", "#B4E0A7"]
])

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@mbostock/revenue-by-music-format-1973-2018 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/17a0deb48c0cfa8585cf87064268e4fb/raw/402369f286ae7d89b5642f15450da6d8292115e4/music.csv";

// 读取 csv 文件
// 参考 d3-dsv 模块 https://github.com/d3/d3-dsv
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-fetch-and-parse-data
// 使用 d3.csv(url, requestInit, row) 来解析数据
// 这里设置的参数是 url 数据文件的链接，以及 row 读取/解析每行数据的函数
// * 第一个参数 dataURL 就是 url
// * 第二个参数就是数据读取函数，先通过对象解构的方式，只读取每行数据的其中三个属性 Format、Year、"Revenue (Inflation Adjusted)"（采用经过通胀校正的数据），然后对这些属性进行重命名以及属性值进行格式转换（字符串变成数值）
d3.csv(dataURL, ({ Format, Year, ["Revenue (Inflation Adjusted)"]: Revenue }) => ({ name: Format, year: +Year, value: +Revenue })).then((data) => {
  // 返回一个对象数组，每一个对象对应于 csv 表格的一行数据
  console.log(data);
  // D3 在解析 csv 表格生成数组时，为该数组添加了一个属性 columns，它也是一个数组，包含了表格的列属性（即原来的二维数据表的表头信息）
  // console.log(data.columns);

  /**
   *
   * 对数据进行转换
   *
   */
  // 通过堆叠生成器对数据进行转换，便于后续绘制堆叠图
  // 返回一个数组，每一个元素都是一个系列（条形图中每个条带就是由多个系列堆叠而成的）
  // 具体可以参考官方文档 https://d3js.org/d3-shape/stack 或 https://github.com/d3/d3-shape/blob/main/README.md#stacks
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#堆叠生成器-stacks
  const series = d3.stack()
    // 设置系列的名称（数组）
    .keys(colors.keys()) // 采用映射 colors 中的键名称，D3 为每一个系列都设置了一个属性 key，其值是系列名称
    // 设置各系列的数据读取函数
    // 在调用堆叠生成器对原始数据进行转换过程中，每一个原始数据 d 和系列名称 key（就是在 stack.keys([keys]) 设定的数组中的元素）会作为入参，分别调用该函数，以从原始数据中获取相应系列的数据
    // 数据读取函数的逻辑要如何写，和后面 👇👇 调用堆叠生成器时，所传入的数据格式紧密相关
    // 因为传入的数据是 map.values() 一个映射的值迭代器（共有 46 个年份的数据）
    // 遍历数据点时 group 就是依次从迭代器中获取到的一个数据点（一个年份的数据），该数据也是一个映射（包含 23 个格式名称）
    // 要从中获取相应系列 key 的数据，通过 group.get(key) 获取相应系列（音乐格式名称）的数据（一个对象）
    .value((group, key) => group.get(key).value)
    // 设置系列堆叠排序函数，即对应于堆叠条形图中该系列叠放的次序
    // 采用 D3 的一种内置的排序函数 d3.stackOrderReverse 堆叠次序和系列名称数组 keys 次序相反
    .order(d3.stackOrderReverse)
    // 调用堆叠生成器，传入数据（并不是直接传入 data 数据集，进行了一些转换处理）
    // 使用方法 d3.rollup() 对数据集 data 进行分组，并对各分组进行「压缩降维」，返回一个 InternMap 对象
    // 具体参考官方文档 d3-array 模块 https://github.com/d3/d3-array#rollup
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process
    // 对原始数据 data 中 1058 个元素进行分组，先基于元素的 year 年份进行分组，然后**对各分组再基于 name 格式名称**进行分组
    // 最后得到一个嵌套的 InternMap 对象，共有 46 个映射（外层，基于年份）
    // 而每个映射的值也是一个 InternMap 对象，都有 23 个映射（内层，基于格式名称）
    // 其实这里使用 d3.rollup() 方法并没有对数据集进行「压缩降维」，只是将数组的扁平化数据结构，变成映射的层级数据结构
    // 最后通过 map.values() 返回一个映射的值迭代器，通过循环结构可以遍历所有值（46 个年份的数据）
    (d3.rollup(
      // 第一个参数是需要分组的数据 data
      data,
      // 第二个参数是对分组进行压缩的函数，每个分组会依次调用该函数（入参就是包含各个分组元素的数组）
      // 如果存在嵌套分组，则该函数只会被「叶子」分组（嵌套得最深的各个分组）调用，因为这些分组才直接包含原数据集中的元素
      // 返回值会作为 InternMap 对象中（各分组的）键值对中的值
      // 由于按照年份和格式名称进行分组后，每个嵌套分组中只会有 1 个元素
      // 所以这里通过数组解构，读取里面唯一的元素（原始数据集中的元素）并没有进行变换直接返回
      ([d]) => d,
      // 余下的参数是一系列返回**分组依据**的函数
      d => d.year,
      d => d.name).values())
    // 最后对于堆叠生成器所返回的数组（嵌套数组）进行遍历，对具体的数据点进行处理，并返回遍历的数据 s
    // 其中 s 是当前所遍历的元素（共有 46 个元素），它是一个系列的数据（也是一个数组）
    // 然后在回调函数中对 s（嵌套数组）进行遍历，这些元素是该系列的数据点，每个元素分别对应于不同条带的该堆叠层的值，所以有 23 个元素
    // 每一个数据点 d 都是一个二元数组（里面的元素依次对应于堆叠的下边界和上边界），并且具有属性 data（它是一个映射，映射值就是对应的原始数据集的数据点，即 csv 表格中的一行数据）
    // 这里使用 d.data.get(s.key) 从原始数据点中提取出该系列的数据（s.key 为当前所遍历的系列名称）
    // 然后通过赋值覆盖原始值 d.data = d.data.get(s.key)
    // 相当于简化了 d.data 的数据
    .map(s => (s.forEach(d => d.data = d.data.get(s.key)), s))

  console.log(series);

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是条形图的各种分类（不同年份），使用 d3.scaleBand 构建一个带状比例尺
  // 使用 d3-scale 模块
  // 具体参考官方文档 https://d3js.org/d3-scale/band 或 https://github.com/d3/d3-scale#scaleBand
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#带状比例尺-band-scales
  const x = d3.scaleBand()
    // 设置定义域范围
    // 直接将 data 数据集中所提取到的年份作为定义域的数组，虽然存在重复值，但是并不影响映射 ❓
    // 由于 D3 会在内部使用 InternMap 对数据进行去重后再映射
    .domain(data.map(d => d.year))
    // 设置值域范围
    // svg 元素的宽度（减去留白区域）
    // 使用 scale.rangeRound() 方法，可以进行修约，以便实现整数（46 个年份）映射到整数（像素）
    .rangeRound([margin.left, width - margin.right])

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（营收值），使用 d3.scaleLinear 构建一个线性比例尺
  // 具体参考官方文档 https://d3js.org/d3-scale/linear 或 https://github.com/d3/d3-scale/tree/main#linear-scales
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#线性比例尺-linear-scales
  const y = d3.scaleLinear()
    // 设置定义域范围
    // [0, ymax] 其中 ymax 是各年份的音乐在不同（媒介）格式营收的累计值中的最大值
    // 通过 d3.max() 从数据 series 中获取各年份的音乐营收值的最大值
    // 但是系列数据 series 是一个嵌套的数组，所以需要比较复杂的访问函数
    // 第一层 d.max() 的数据访问函数，其入参是当前所遍历的系列数据
    // 第二层的 d.max() 的数据访问函数，其入参是该系列当前所遍历的数据点（某个年份在该媒介格式的营收值）
    // 但是这是计算好的堆叠数据，所以数据点是一个二维数组 [stackBottom, stackTop]，表示某个年份在该媒介格式的营收值在堆叠图中的堆叠位置，因为要获取最大值，所以返回当前系列的堆叠顶部值 stackTop 即可，即二维数组的第二个元素 d[1]
    // 并通过 continuous.nice() 编辑定义域的范围，通过四舍五入使其两端的值更「整齐」nice，便于进行映射
    .domain([0, d3.max(series, d => d3.max(d, d => d[1]))]).nice()
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    .range([height - margin.bottom, margin.top])

  // 设置颜色比例尺
  // 为不同系列设置不同的配色
  // 使用 d3.scaleOrdinal() 排序比例尺 Ordinal Scales 将离散型的定义域映射到离散型值域
  // 具体参考官方文档 https://d3js.org/d3-scale/ordinal 或 https://github.com/d3/d3-scale/tree/main#scaleOrdinal
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#排序比例尺-ordinal-scales
  const color = d3.scaleOrdinal()
    // 设置定义域范围
    // 各系列的名称，即 23 个媒介格式
    .domain(colors.keys())
    // 设置值域范围
    // （使用自定义的配色方案）从前面创建的映射 colors 中提取颜色值
    // 通过 colors.values() 返回一个映射的值迭代器，可以在循环结构中遍历获取颜色值
    .range(colors.values())

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制横坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
    .attr("transform", `translate(0,${height - margin.bottom})`)
    // 横轴是一个刻度值朝下的坐标轴
    // 💡 注意这里使用的是方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
    // 会将选择集中的元素 <g> 传递给坐标轴对象的方法，作为第一个参数
    // 以便将坐标轴在相应容器内部渲染出来
    // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call 或 https://github.com/d3/d3-selection#selection_call
    // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法
    .call(d3.axisBottom(x)
      // 自定义坐标轴的刻度值
      // 通过 axis.tickValues([values]) 传递一个数组，用其中的元素覆盖比例尺自动生成的刻度值
      // 方法 d3.ticks(start, stop, count) 根据 count 数量对特定范围（由 start 和 stop 指定）进行均分
      // 返回一个包含一系列分隔值的数组，用作刻度值
      // 第一、二个参数 start 和 stop 分别指定范围的起始和结束值
      // 这里先通过 d3.extent(x.domain()) 获取横坐标轴比例尺的定义域范围
      // 返回值是一个数组 [xmin, xmax]，再通过解构来获取 start 和 stop
      // 第三个参数 count 作为分割数量的参考值，避免过多的刻度值出现，相互重叠影响阅读
      // 具体参考官方文档 https://d3js.org/d3-array/ticks#ticks 或 https://github.com/d3/d3-array/tree/main#ticks
      // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#刻度生成
      .tickValues(d3.ticks(...d3.extent(x.domain()), width / 80))
      // 将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
      .tickSizeOuter(0))

  // 绘制纵坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${margin.left},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    .call(d3.axisLeft(y)
      // 设定刻度值的格式
      // 通过自定义函数来设置刻度值，比例尺默认生成的每个刻度都会调用该函数
      // 入参 x 是当前所遍历的刻度值，这里将原数值除以 10 亿，并将结果保留到个位数
      // 即纵坐标轴刻度值的单位是 billion
      // JavaScript 中支持数字的缩写，通过在数字后面附加字母 "e" 并指定零的个数来缩短数字，1 billion = 1e9
      .tickFormat(x => (x / 1e9).toFixed(0)))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 为纵坐标轴添加标注信息
    // 并选中最后一个刻度值，即 <text> 元素，进行复制
    .call(g => g.select(".tick:last-of-type text").clone()
      .attr("x", 3) // 设置元素的偏移量
      .attr("text-anchor", "start") // 设置文字的对齐方式
      .attr("font-weight", "bold") // 设置字体的样式
      .text("Revenue (billions, adj.)")) // 设置文本内容

  /**
   *
   * 绘制条形图内的柱子
   *
   */
  // 用于格式化 tooltip 文本内容
  const formatRevenue = x => (+(x / 1e9).toFixed(2) >= 1)
    ? `${(x / 1e9).toFixed(2)}B` // 如果数值大于 10 亿，则以 10 亿作为基数，修约到小数点后 2 位，并添加 B 后缀
    : `${(x / 1e6).toFixed(0)}M` // 如果数值小于 10 亿，则以 100 万作为基数，修约到个位，并添加 M 后缀

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
    // 设置颜色，不同系列/堆叠层对应不同的颜色
    // 通过对每一个系列（数组具有属性 key）对象解构得到系列的名称 key，再通过颜色比例尺映射 color(key) 得到对应的颜色
    .attr("fill", ({ key }) => color(key))
    // 基于原选择集进行「次级选择」，选择集会发生改变
    // 详细介绍可以查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#次级选择
    .call(g => g.selectAll("rect") // 使用 <rect> 元素为每一堆叠层绘制出一系列的小矩形
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
      // 所以入参 d 是一个堆叠系列的数据（即 series 的一个嵌套数组），这里并没有进行额外的处理直接返回，让该系列里的每个数据点都与一个 <rect> 元素绑定
      .data(d => d)
      .join("rect") // 将元素绘制到页面上
      // 为每个小矩形分别设置左上角 (x, y) 及其 width 和 height 来确定其定位和形状
      // 每个矩形的左上角横轴定位 x 由它所属的年份的名称决定
      // 可以通过所绑定数据的属性 d.data.year 来获取
      // 使用横坐标轴的比例尺（带状比例尺）进行映射，求出具体的横轴坐标值
      .attr("x", d => x(d.data.year))
      // 每个矩形的左上角纵轴定位 y 由它的堆叠上边界决定
      // 可以通过它所绑定的数据（一个数组）的第二个元素 d[1] 来获取
      // 使用纵坐标轴的比例尺（线性比例尺）进行映射，求出具体的纵轴坐标值
      .attr("y", d => y(d[1]))
      // 每个矩形的宽度
      // 通过横轴的比例尺的方法 x.bandwidth() 获取 band 的宽度，并减去 1px 作为条带之间的间隔
      .attr("width", x.bandwidth() - 1)
      // 每个矩形的高度
      // 由所绑定的数据（一个数组）的两个元素（上边界和下边界）之间的差值所决定
      // ⚠️ 注意这里的差值是 y(d[0]) - y(d[1]) 因为 svg 的坐标体系中向下是正方向
      // 所以下边界 d[0] 所对应的纵坐标值 y(d[0]) 会更大，减去 y(d[1]) 的值求出的差值才是高度
      .attr("height", d => y(d[0]) - y(d[1]))
      // 最后为每个矩形 <rect> 元素之内添加 <title> 元素
      // 以便鼠标 hover 在相应的小矩形之上时，可以显示 tooltip 提示信息
      .append("title")
      // 设置 tooltip 的文本内容
      // 其中 d.data.name 是媒介格式名称，d.data.year 是所属的年份
      // 而 d.data.value 是具体的营收值
      .text(d => `${d.data.name}, ${d.data.year}
${formatRevenue(d.data.value)}`));

});