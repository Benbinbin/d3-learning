// 参考自 https://observablehq.com/@d3/slope-chart/3

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
// margin 为前缀的参数
// 其作用是在 svg 的外周留白，构建一个显示的安全区，以便在四周显示坐标轴
const marginTop = 40;
const marginRight = 50;
const marginBottom = 10;
const marginLeft = 50;
const padding = 3; // 标签文本与数据点（线段端点）的间距

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height])
  .attr("style", "font: 10px sans-serif;"); // 设置 svg 中的文本字体样式

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/slope-chart/3 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/9de278ddf6c44d05b41297cce5335cfb/raw/ee28a3cde18ec282bdb1ae2a68e12bf27263f1a2/government-receipts-of-gdp.csv";

d3.csv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据虽然是时间（年份），但是这里将它们看作是不同的（离散的）类别（两个年份表示两个类别）
  // 使用 d3.scalePoint 构建一个点状比例尺，根据定义域数组的离散元素的数量，将值域的范围分割为等距的各段，各个**分隔点**与定义域中的离散元素依次映射
  // 具体可以参考官方文档 https://d3js.org/d3-scale/point#scalePoint
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#点状比例尺-point-scales
  // 💡 点状比例尺和带状比例尺 band scale（一般用于柱状图中）类似，就像是将 band 的宽度设置为 0
  const x = d3.scalePoint()
    // 这里没有从原始数据集中提取出年份作为定义域的数组，而是直接构建 [0, 1] 数组（元素的数量与不同年份的数量一致即可，都是 2）
    // 对于后续的映射并无很大影响，只需要进行对应的关联即可
    .domain([0, 1])
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    .range([marginLeft, width - marginRight])
    // 设定预留的左右空间（外间隔，以便放置文字标签）
    // 传入的数值是百分比，范围在 0 至 1 之间（包含端点），是以分割所得的等距宽度作为基准，假如设置为 1 则表示两侧预留空白的宽度，和分割所得的等距段的宽度一致
    .padding(0.3);

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（GDP 占比），使用 d3.scaleLinear 构建一个线性比例尺
  // 具体参考官方文档 https://d3js.org/d3-scale/linear
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#线性比例尺-linear-scales
  const y = d3.scaleLinear()
    // 设置定义域范围
    // 先使用 JS 数组原生方法 arr.flatMap(mapFunc) 对原数据集 data 进行转换
    // 该方法先遍历数组的每一个元素（让它们分别执行 mapFunc 函数），然后再将所得的嵌套数组展平（一级）
    // 这里的作用就是将每个数据点（国家）两个年份所对应值 GDP 占比值提取出来，构成一个二元数组，再展开整合到一个数组中
    // 最后用 d3.extent() 计算出这些 GDP 占比值的范围
    .domain(d3.extent(data.flatMap(d => [d[1970], d[1979]])))
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    .range([height - marginBottom, marginTop]);

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制横坐标轴
  // 实际上这里并没有使用坐标轴相关的模块，只是添加了两个文本标签，以标记不同的年份（作为两个类别）
  // 💡 可以将其理解为没有轴线的横坐标轴
  svg.append("g")
    // 设置文字的对齐方式
    .attr("text-anchor", "middle")
    .selectAll("g") // 为不同的文本标签创建容器 <g>
    // 绑定数据
    // 这里绑定的数据是数组 [0, 1]（其实该数组的两个元素分别对应于两个年份）
    // 和前面 ☝️ 设置横坐标轴的比例尺的定义域时所绑定的数据一致
    .data([0, 1])
    .join("g") // 将元素绘制到页面上
    // 通过设置 CSS 的 transform 属性将不同的容器「移动」到相应的位置
    // 基于绑定数据 i（这里用符号 i 表示，因为所绑定的数组的元素和它的索引值一样）再通过横坐标轴比例尺 x(i) 进行映射，得到相应的横坐标值；而纵坐标值都是 20（即移动到 svg 的顶部，距离 20px 的位置）
    .attr("transform", (i) => `translate(${x(i)},20)`)
    // 在每个容器中都添加一个 `<text>` 元素，以设置文本内容
    // 基于所绑定的数据 i 来设置不同的内容，如果不为 0（绑定的是数组的第二个元素），则设置的文本内容是 1979；否则为 1970
    .call(g => g.append("text").text((i) => i ? 1979 : 1970))
    // 在每个容器中都添加一个 `<line>` 元素（以绘制一小段直线），作为坐标轴的刻度线
    // 直线的起始点的纵坐标值 y1 都是 3，终止点的纵坐标值 y2 都是 9（所以这一段小直线长度为 6px）
    // 由于直线的方向是垂直向下的，即起始点和终止点的横坐标值是相同的，所以可以忽略不设置（采用默认值）
    // 最后设置直线的描边颜色，继承父元素的颜色（黑色）
    .call(g => g.append("line").attr("y1", 3).attr("y2", 9).attr("stroke", "currentColor"));

  /**
   *
   * 绘制折线图内的线段
   *
   */
  // 使用方法 d3.line() 创建一个线段生成器
  // 线段生成器会基于给定的坐标点生成线段（或曲线）
  // 具体可以参考官方文档 https://d3js.org/d3-shape/line 或 https://github.com/d3/d3-shape/tree/main#lines
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
  const line = d3.line()
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次横坐标读取函数和纵坐标读取函数，以返回该数据所对应的横总坐标值
    // 设置横坐标读取函数
    // 这里基于每个数据点索引值 i 并采用比例尺 x(i) 进行映射，计算出相应的横坐标
    // 因为 ☝️ 前面设置横坐标轴的比例尺时，定义域直接使用数组 [0, 1] （而不是年份）
    .x((d, i) => x(i))
    // 设置纵坐标读取函数
    // 这里直接传入纵坐标比例尺作为读取函数
    // 其实也是让数据点 d 调用该比例尺，然后将返回值作为纵坐标值
    // 相当于 d => y(d)
    .y(y);

  // 绘制（多条）折线
  // 为这些线段创建一个容器 <g>
  svg.append("g")
    // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
    .attr("fill", "none")
    // 设置描边颜色
    .attr("stroke", "currentColor")
    // 使用路径 <path> 元素为每个国家创建一条线段
    .selectAll("path")
    // 绑定数据 data
    // 其中每个元素（对象）都是一个国家的数据，对应分别绑定到不同的 <path> 元素上，就可以绘制出多条不同的线段
    .data(data)
    .join("path") // 将这些线段绘制到页面上
    // 其中每个 <path> 元素的属性 `d` 的值是由函数 (d) => line([d[1970], d[1979]]) 返回值而定
    // 该函数所接受的参数 d 是所绑定的数据点（是一个对象，具有三个属性 {1970: number , 1979: number, country: string }）
    // 这里提取了每个国家在 1970 年和 1979 年的数据数组 [d[1970], d[1979]] 传入到线段生成器 line() 中，生成线段
    // 所以每个国家的线段只由两个端点连接而成（分别对应 1970 年和 1979 年 GDP 占比）
    .attr("d", (d) => line([d[1970], d[1979]]));

  /**
   *
   * 为每条线段添加标注
   *
   */
  // 通过 scale.tickFormat(count) 构建一个数值格式器
  // 根据所设置的刻度线数量 count（这里设置为 100）来自动确定数据的精度，更适用于阅读
  // 该数值格式器在 👇 后面用于对标签文本进行格式化
  const formatNumber = y.tickFormat(100);

  // 为这些标注添加一个容器
  svg.append("g")
    // 为两个年份的标注分别设置一个容器（以便在沿横轴方向上分别进行定位）
    .selectAll("g")
    // 绑定数据
    // 这里绑定的数据是数组 [0, 1]（其实该数组的两个元素分别对应于两个年份）
    // 和前面 ☝️ 设置横坐标轴的比例尺的定义域时所绑定的数据一致
    .data([0, 1])
    .join("g") // 将容器添加到页面上
    // 通过设置 CSS 的 transform 属性将不同的容器「移动」到相应的位置
    // 基于绑定数据 i（这里用符号 i 表示，因为所绑定的数组的元素和它的索引值一样）再通过横坐标轴比例尺 x(i) 进行映射，得到相应的横坐标值，还要设置一小段间距，让标签（容器）与折线有一定的距离，以避免重叠
    // 基于所绑定的数据 i 来设置间距的值，如果不为 0（绑定的是数组的第二个元素，对应于 1979 年的标签），则标签（容器）位于斜率图的右侧，则间距值为 padding（正数），即容器再向右移动一小段距离；如果为 0（绑定的是数组的第一个元素，对应于 1970 年的标签），则标签（容器）位于斜率图的左侧，则间距值为 -padding（负数），即容器再向左移动一小段距离
    // 而纵坐标值都是 0（不在纵轴方向上移动）
    .attr("transform", (i) => `translate(${x(i) + (i ? padding : -padding)},0)`)
    // 设置标签文本的对齐方式
    .attr("text-anchor", (i) => i ? "start" : "end")
    // 进行二次选择，在各个容器内添加一系列的 <text> 元素，以添加文本标注
    .selectAll("text")
    // ⚠️ 使用 select.selectAll() 所创建的新选择集会有多个分组
    // 返回的选择集是由多个分组（各个 <g> 容器中）的虚拟/占位 <text> 元素构成的
    // 由于新的选择集会创建多个分组，那么原来所绑定数据与（选择集中的）元素的对照关系会发生改变
    // 从原来的一对一关系，变成了一对多关系，所以新的选择集中的元素**不会**自动「传递/继承」父节点所绑定的数据
    // 所以如果要将原来选择集中所绑定的数据继续「传递」下去，就需要手动调用 selection.data() 方法，以显式声明要继续传递数据
    // 在这种场景下，该方法的入参应该是一个返回数组的**函数**
    // 每一个分组都会调用该方法，并依次传入三个参数：
    // * 当前所遍历的分组的父节点所绑定的数据 datum
    // * 当前所遍历的分组的索引 index
    // * 选择集的所有父节点 parent nodes
    // 详细介绍可以查看笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#绑定数据
    // 这里入参 i 就是该分组绑定的数据（共有 2 个分组，分别绑定的数据是 0 或 1）
    // 然后基于 i 对数据集 data 进行转换，抽取出对应年份的数据（当 i=0 时，抽取出 1979 年的数据；当 i=1 则抽取 1970 年的数据）
    // 使用方法 d3.zip(arr1️⃣, arr2️⃣, ...) 对输入一系列的数组 arr1️⃣、arr2️⃣ ... 实现类似矩阵转置的功能
    // 即依次提取各数组的第 i 个元素，将它们构成新数组，然后再将这些数组作为元素，组合成一个新的数组（一个嵌套数组）
    // 具体可以参考官方文档 https://d3js.org/d3-array/transform#zip
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process
    // 1️⃣ 这里传入的第一个参数是基于数据集 data 生成的一个数组
    // data.map(i ? (d) => `${formatNumber(d[1979])} ${d.country}` : (d) => `${d.country} ${formatNumber(d[1970])}`)
    // 方法 data.map(func) 让数组中的每个元素依次调用处理函数 func，并将函数的返回值构成一个新的数组
    // 这里会基于当前（选择集）分组所绑定的数据 i 的不同，而对 data 的每个元素采用不同的转换方式（生成不同格式的字符串）
    // 当 i=0 时，抽取出 1979 年的数据 d[1979] 并用数值格式器 formatNumber(d[1979]) 调整精度，然后加上当前所遍历的元素所属的国家名称
    // 当 i=1 时，则是先写出当前所遍历的元素所属的国家名称，再加上 1970 年的数据 d[1970] 并用数值格式器 formatNumber(d[1970]) 调整精度
    // 2️⃣ 这里传入的第二个参数也是基于数据集 data 生成的另一个数组
    // dodge(data.map(d => y(d[i ? 1979 : 1970])))))
    // 首先使用方法 data.map(func) 对数据集 data 进行转换，在每个元素执行处理函数中，调用了纵坐标轴比例尺 y(d[?]) 将当前所遍历的元素/国家（相应年份的）GDP 占比值映射为纵坐标轴的值（当 i=0 时映射 1970 年数据；当 i=1 时映射 1979 年数据），作为标签在纵轴方向的定位
    // ⚠️ 因为不同国家在同一年份的数据 d 可能相同或相近，如果将比例尺 y(d) 映射所得的值直接作为这些标签的纵轴坐标值，那么它们就可能重叠
    // 所以这里还需要使用方法 dodge() 对布局定位进一步优化，以提高标签的视觉可视性
    // 方法 dodge() 的具体代码看 👇 后面
    // 最后经过 d3.zip() 将数组 1️⃣ 和数组 2️⃣ 进行「整合」
    // 所以每个 <text> 元素所绑定的数据都是一个二元数组，第一个元素是字符串（从数组 1️⃣ 提取出来的），作为标注内容；第二个元素是数值（从数组 2️⃣ 提取出来的），用于在纵坐标轴上定位
    .data((i) => d3.zip(
      data.map(i ? (d) => `${formatNumber(d[1979])} ${d.country}` : (d) => `${d.country} ${formatNumber(d[1970])}`),
      dodge(data.map(d => y(d[i ? 1979 : 1970])))))
    .join("text") // 将 <text> 元素添加到页面上
    // 设置各个标注的定位
    // 只需要设置纵坐标值 y 即可（横坐标值都相同，在前面 ☝️由（标签所属的）容器进行统一定位）
    .attr("y", ([, y]) => y)
    // 在纵轴方向上为文本设置一点小偏移
    .attr("dy", "0.35em")
    // 设置标注的文本内容
    .text(([text]) => text);
});

/**
 *
 * 用于调整标签定位的核心函数
 *
 */
// 第一个参数是数组 positions，它的元素都是一个数值，表示对应文本标签沿着 y 轴定位的坐标值
// 对它们进行迭代处理，以便对布局定位进一步优化，提高标签的视觉可视性
// 第二个参数 separation 是标签间的距离（需要保证标签之间的间距要足够大于该值，这个值应该是基于标签字体大小/行高而设置的）
// 第三个参数 maxiter 是最大的迭代次数
// 第四个参数 maxerror 是迭代
function dodge(positions, separation = 10, maxiter = 10, maxerror = 1e-1) {
  positions = Array.from(positions); // 转换为数组（保险操作 ❓ 这一步可忽略 ❓）
  let n = positions.length; // 数组长度
  // 使用 JavaScript 原生方法 isFinite() 检查数组中各元素（数值）是否均为有限的（即不是 NaN 也不是 ±Infinity），否则抛出错误
  if (!positions.every(isFinite)) throw new Error("invalid position");
  // 如果数组长度不大于 1（只有一个元素，则不存在标签重叠的问题），则不需要进行迭代处理，直接返回数组
  if (!(n > 1)) return positions;
  // 使用 d3.range(stop) 创建一个等差数列，参数 stop 表示数列的结束值（不包括），默认的开始值是 0，并用数列的各项构成一个数组
  // 所以这里基于数组 positions 的长度，创建一个等长的数组 [0, 1, 2, ..., (positions.length)-1]
  // 相当于为 positions 数组创建一个相应的**索引值数组**，可以对该数组进行排序，再基于该数组提取出相应的相邻标签进行调整，而不打乱原数组 positions
  let index = d3.range(positions.length);
  // 进行迭代优化布局定位
  for (let iter = 0; iter < maxiter; ++iter) {
    // 使用 index.sort((i, j) => comparator) 对数组进行排序，基于索引值在 positions 中所对应元素的值的大小来调整
    // 其中对比函数 comparator 采用 D3 内置的对比器 d3.ascending(a, b) 实现升序排列
    // 即索引值在 positions 中所对应的元素的值较小的排在前面（较大的则排在后面）
    index.sort((i, j) => d3.ascending(positions[i], positions[j]));
    // 用于记录标签调整/移动的步长的最大值，作为提前跳出迭代的条件
    let error = 0;
    // 遍历每个元素，对定位值进行调整
    for (let i = 1; i < n; ++i) {
      // 计算在 y 轴上定位相邻的两个标签的距离差值 delta
      // 这里 positions[index[i]] 和 positions[index[i - 1]] 可以获取到在 y 轴上定位相邻的标签的纵坐标值，因为前面对 index 进行了排序
      let delta = positions[index[i]] - positions[index[i - 1]];
      // 判断差值 delta 是否大于预设的距离 separation
      if (delta < separation) {
        // 如果两个相邻的标签间距不够，则需要对这两个标签的定位进行调整
        // 移动/调整的步长 (separation - delta)/2 是根据现有间距与预设间距的相差值计算出来的（它们差值的一半）
        delta = (separation - delta) / 2;
        // 将当前遍历的标签所需调整/移动的步长，与之前存下的步长进行比较，取两者之间的**最大值**
        error = Math.max(error, delta);
        positions[index[i - 1]] -= delta; // 调整在纵轴方向上定位较低的标签的定位，再往下移动
        positions[index[i]] += delta; // 调整在纵轴方向上定位较高的标签的定位，再往上移动
        // 调整后两个标签间距就扩大了
      }
    }
    // 当经历了这一轮的迭代后，如果这些标签的移动步长中最大值 error 都小于参数 maxerror（很小的一个值）
    // 则表示这些标签所需调整的都不大，所以可以提前结束迭代了
    if (error < maxerror) break;
  }
  // 返回调整后的数组
  return positions;
}